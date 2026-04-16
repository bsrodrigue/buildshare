import json
import os
import re

def format_size(size_bytes):
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.2f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.2f} MB"

def get_module_group(path):
    # Handle node_modules
    if "node_modules/" in path:
        parts = path.split("node_modules/")[-1].split("/")
        if parts[0].startswith("@") and len(parts) > 1:
            return f"node_modules/{parts[0]}/{parts[1]}"
        return f"node_modules/{parts[0]}"
    
    # Handle app modules
    if path.startswith("modules/"):
        parts = path.split("/")
        if len(parts) > 1:
            return f"modules/{parts[1]}"
        return "modules"

    # Handle libs
    if path.startswith("libs/"):
        parts = path.split("/")
        if len(parts) > 1:
            return f"libs/{parts[1]}"
        return "libs"

    # Others: just the first directory or root
    parts = path.split("/")
    if len(parts) > 1:
        return parts[0]
    return "root"

def analyze_atlas(file_path):
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return

    all_modules = []

    with open(file_path, 'r') as f:
        for line in f:
            if not line.strip():
                continue
            try:
                data = json.loads(line)
                
                # Recursively find any objects with 'size' and 'relativePath'
                def find_modules(obj, platform="unknown"):
                    if isinstance(obj, list):
                        for item in obj:
                            find_modules(item, platform)
                    elif isinstance(obj, dict):
                        if 'size' in obj and ('relativePath' in obj or 'absolutePath' in obj):
                            name = obj.get('relativePath', obj.get('absolutePath', 'unknown'))
                            all_modules.append({
                                'name': name,
                                'size': obj['size'],
                                'platform': platform
                            })
                        else:
                            for key in obj:
                                find_modules(obj[key], platform)

                if isinstance(data, list):
                    find_modules(data, platform=data[0] if len(data) > 0 else "unknown")
                elif isinstance(data, dict):
                    find_modules(data)
                    
            except json.JSONDecodeError:
                continue

    if not all_modules:
        print("No modules found in the atlas file.")
        return

    # Aggregation
    groups = {}
    for mod in all_modules:
        group_name = get_module_group(mod['name'])
        if group_name not in groups:
            groups[group_name] = 0
        groups[group_name] += mod['size']

    # Sort groups by size
    sorted_groups = sorted(groups.items(), key=lambda x: x[1], reverse=True)
    
    # Sort individual modules by size
    sorted_modules = sorted(all_modules, key=lambda x: x['size'], reverse=True)

    print(f"\n{'='*100}")
    print(f"{'TOP 15 AGGREGATED MODULES':^100}")
    print(f"{'='*100}")
    print(f"{'Rank':<5} {'Size':<12} {'Module Group'}")
    print("-" * 100)
    for i, (group, size) in enumerate(sorted_groups[:15]):
        print(f"{i+1:<5} {format_size(size):<12} {group}")

    print(f"\n{'='*100}")
    print(f"{'TOP 15 INDIVIDUAL FILES':^100}")
    print(f"{'='*100}")
    print(f"{'Rank':<5} {'Size':<12} {'Module'}")
    print("-" * 100)
    seen_files = set()
    count = 0
    for mod in sorted_modules:
        if count >= 15:
            break
        key = (mod['name'], mod['size'])
        if key in seen_files: continue
        seen_files.add(key)
        print(f"{count+1:<5} {format_size(mod['size']):<12} {mod['name']}")
        count += 1
    print(f"{'='*100}\n")

if __name__ == "__main__":
    atlas_path = "/home/badinirr/Workspace/contracts/Arnaud/Elite-app/.expo/atlas.jsonl"
    analyze_atlas(atlas_path)
