export class JSONService {
  public static stringify(data: unknown): string {
    return JSON.stringify(data, null, 2);
  }
}
