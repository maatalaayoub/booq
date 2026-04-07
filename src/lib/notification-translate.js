/**
 * Translates notification title and message based on type + data.
 * Falls back to DB-stored values if no translation key exists or
 * if dynamic placeholders can't be resolved.
 */
export function translateNotification(notification, t) {
  const { type, title, message, data } = notification;

  const titleKey = `notifications.type.${type}.title`;
  const messageKey = `notifications.type.${type}.message`;

  const translatedTitle = t(titleKey);
  const translatedMessage = t(messageKey);

  // t() returns the key itself when no translation is found
  const finalTitle = translatedTitle !== titleKey ? translatedTitle : title;

  let finalMessage = translatedMessage !== messageKey ? translatedMessage : message;

  // Interpolate dynamic placeholders from data
  if (finalMessage && data) {
    if (data.businessName) {
      finalMessage = finalMessage.replace('{business}', data.businessName);
    }
    if (data.username) {
      finalMessage = finalMessage.replace('{username}', data.username);
    }
  }

  // If placeholders remain unresolved, fall back to DB-stored message
  if (finalMessage && (finalMessage.includes('{business}') || finalMessage.includes('{username}'))) {
    finalMessage = message;
  }

  return { title: finalTitle, message: finalMessage };
}
