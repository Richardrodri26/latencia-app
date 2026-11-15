/**
 * Muestra `_{…}` y también `_A` / `_B` (API A y B) como subíndice (`<sub>`) y deja el resto del texto igual.
 * Sin librerías de LaTeX.
 */
export function MathText({ text }: { text: string }) {
  const nodes: Array<string | React.JSX.Element> = [];
  let last = 0;
  for (const m of text.matchAll(/_\{([^}]*)\}|_([AB])(?![A-Za-z])/g)) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    nodes.push(<sub key={m.index}>{m[1] ?? m[2]}</sub>);
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}
