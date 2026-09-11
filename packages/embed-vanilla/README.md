# monti-embed-sdk

```js
import { mountMontiEmbed } from "monti-embed-sdk";

const monti = mountMontiEmbed({
  embedKey: "emb_YOUR_KEY",
  apiBase: "https://monti.devclub.dev/",
});

monti.open();
// monti.destroy();
```

`mountMontiEmbed()` starts mounting immediately and returns the controllable instance. Use `await monti.mount()` when you need to wait for the public resolve and DOM mount.
