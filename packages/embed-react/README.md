# @monti/embed-react

```tsx
import { MontiEmbedReact } from "@monti/embed-react";

export function SupportWidget() {
  return (
    <MontiEmbedReact
      embedKey="emb_YOUR_KEY"
      apiBase="https://monti.devclub.dev/"
      onError={(error) => console.error(error.code, error.message)}
    />
  );
}
```

The package also exports `useMontiEmbed()` and an imperative ref with `open`, `close`, `toggle`, `destroy`, and `getInstance`.
