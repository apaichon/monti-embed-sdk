# @monti/embed-core

Framework-neutral, typed Monti Call Center embed lifecycle. Most applications should install one of the framework adapters instead.

```ts
import { createMontiEmbed } from "@monti/embed-core";

const monti = await createMontiEmbed({
  embedKey: "emb_YOUR_KEY",
  apiBase: "https://monti.devclub.dev/",
  onOpen: () => console.log("open"),
  onError: (error) => console.error(error.code, error.message),
});

monti.open();
// monti.destroy();
```

Use `container: element` for an inline iframe. Without a container, the SDK creates a floating launcher.
