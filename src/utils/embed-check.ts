/**
 * Checks if the application is running in non-embedded mode
 * @returns true if the noEmbed parameter is present in the URL
 */
export const isNonEmbedded = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.has("noEmbed");
};
