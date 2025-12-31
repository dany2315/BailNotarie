/**
 * Copie du texte dans le presse-papiers
 * @param text - Le texte à copier
 * @returns Promise<boolean> - true si la copie a réussi, false sinon
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
      if (!text) {
        return false;
      }
  
      // Vérifier si l'API Clipboard est disponible
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
  
      // Fallback pour les navigateurs plus anciens
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
  
      try {
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        return successful;
      } catch (err) {
        document.body.removeChild(textArea);
        return false;
      }
    } catch (error) {
      console.error("Erreur lors de la copie dans le presse-papiers:", error);
      return false;
    }
  }
  