export function Button(props: { onClick: () => void; children?: unknown }) {
  return <button onClick={props.onClick}>{props.children as string}</button>;
}
