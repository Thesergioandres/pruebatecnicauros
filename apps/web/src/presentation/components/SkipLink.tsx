/**
 * Skip link accesible: aparece al recibir foco por teclado y salta al
 * contenido principal. Es la primera parada de la navegacion por Tab
 * y cumple WCAG 2.4.1 (Bypass Blocks).
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="skip-link sr-only focus:not-sr-only"
    >
      Saltar al contenido principal
    </a>
  );
}
