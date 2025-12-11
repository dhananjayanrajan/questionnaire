export function renderFooter() {
  const footer = document.createElement('footer');
  footer.className = 'mt-16 pt-8 border-t border-gray-800 bg-none backdrop-blur text-center text-gray-500 text-sm';
  footer.innerHTML = `© ${new Date().getFullYear()} Questionnaire Bot · Responses saved securely`;
  return footer;
}