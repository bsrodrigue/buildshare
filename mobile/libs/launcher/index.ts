import { Linking } from 'react-native';

import { Logger } from '@/libs/log';

import { toast } from '../notification/toast';

const logger = new Logger('LauncherUtils');

export class LauncherUtils {
  public static async openWhatsApp(phone: string) {
    if (!phone) {
      toast.error('Information', 'Numéro de téléphone non disponible');
      return;
    }

    const cleaned = this.sanitizePhone(phone);
    const waPhone = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;
    const whatsappUrl = `whatsapp://send?phone=${waPhone}`;
    const webUrl = `https://wa.me/${waPhone}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        return;
      }
      // canOpenURL = false either because WA is not installed,
      // OR because Android 11+ blocked the query (manifest fix needed).
      // Fall through to web.
    } catch (e) {
      logger.error(`canOpenURL failed for WhatsApp: ${(e as Error).message}`);
    }

    try {
      await Linking.openURL(webUrl);
    } catch (e) {
      logger.error(`Could not open web WhatsApp fallback ${webUrl}: ${(e as Error).message}`);
      toast.error('WhatsApp', "Impossible d'ouvrir WhatsApp.");
    }
  }

  public static async openCall(phone: string) {
    if (!phone) {
      toast.error('Information', 'Numéro de téléphone non disponible');
      return;
    }

    const cleaned = this.sanitizePhone(phone);

    // encodeURIComponent handles the '+' prefix safely across Android OEMs
    const url = `tel:${encodeURIComponent(cleaned)}`;

    try {
      await Linking.openURL(url);
    } catch (error) {
      // Log the actual error message, not just the object
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to open dialer for ${url}: ${msg}`);
      toast.error('Appel', "Impossible de lancer l'appel.");
    }
  }

  public static async openEmail(email: string, subject?: string) {
    if (!email) return;

    let url = `mailto:${email}`;
    if (subject) {
      url += `?subject=${encodeURIComponent(subject)}`;
    }

    await this.openURL(url, 'Email', "Impossible d'ouvrir votre application de messagerie.");
  }

  public static async openURL(
    url: string,
    errorTitle = 'Lien',
    errorMessage = "Impossible d'ouvrir le lien.",
  ) {
    if (!url) return;

    try {
      await Linking.openURL(url);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to open URL ${url}: ${msg}`);
      toast.error(errorTitle, errorMessage);
    }
  }

  private static sanitizePhone(phone: string): string {
    return phone.replace(/[^\d+]/g, '');
  }
}
