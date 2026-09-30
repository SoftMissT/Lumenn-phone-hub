import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  openFilePicker,
  uploadFile,
} from "../scripts/compat/file-picker-compat.mjs";

const originalFoundry = globalThis.foundry;
const originalFile = globalThis.File;
const originalGame = globalThis.game;

// O defeito real: o FilePicker.upload não cria a pasta de destino e falha com
// "Target directory <path> does not exist". O módulo grava em pasta própria, que
// nunca existiu no disco - upload quebrado sem ninguém ver, porque nada disso
// roda em Node.
afterEach(() => {
  globalThis.foundry = originalFoundry;
  globalThis.File = originalFile;
  globalThis.game = originalGame;
});

function stubFoundry({ failCreate = false } = {}) {
  const calls = [];
  const impl = {
    async createDirectory(source, path) {
      calls.push(["createDirectory", source, path]);
      if (failCreate) throw new Error("Target directory does not exist.");
    },
    async upload(source, path, file) {
      calls.push(["upload", source, path, file.name]);
      return { path: `${path}/${file.name}` };
    },
  };
  globalThis.foundry = { applications: { apps: { FilePicker: { implementation: impl } } } };
  return calls;
}

test("uploadFile cria a pasta de destino antes de enviar", async () => {
  const calls = stubFoundry();
  const file = new File(["x"], "foto.png", { type: "image/png" });

  await uploadFile({ source: "data", path: "lumenn-phone-hub", file });

  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], ["createDirectory", "data", "lumenn-phone-hub"]);
  assert.equal(calls[1][0], "upload");
});

test("uploadFile segue em frente quando a pasta já existe", async () => {
  const calls = [];
  const impl = {
    async createDirectory() {
      calls.push("createDirectory");
      throw new Error("The requested directory already exists.");
    },
    async upload(source, path, file) {
      calls.push("upload");
      return { path: `${path}/${file.name}` };
    },
  };
  globalThis.foundry = { applications: { apps: { FilePicker: { implementation: impl } } } };

  const file = new File(["x"], "foto.png", { type: "image/png" });
  const response = await uploadFile({ path: "lumenn-phone-hub", file });

  assert.deepEqual(calls, ["createDirectory", "upload"]);
  assert.match(response.path, /^lumenn-phone-hub\//);
});

test("uploadFile prefixa o nome com id aleatório (nomes iguais não se sobrescrevem)", async () => {
  const calls = stubFoundry();
  const first = new File(["a"], "foto.png", { type: "image/png" });
  const second = new File(["b"], "foto.png", { type: "image/png" });

  await uploadFile({ path: "lumenn-phone-hub", file: first });
  await uploadFile({ path: "lumenn-phone-hub", file: second });

  const uploaded = calls.filter((call) => call[0] === "upload").map((call) => call[3]);
  assert.equal(uploaded.length, 2);
  assert.notEqual(uploaded[0], uploaded[1], "os dois uploads usaram o mesmo nome");
  assert.ok(uploaded.every((name) => name.endsWith("-foto.png")));
});

test("uploadFile tenta o upload mesmo quando a criação da pasta falha", async () => {
  const calls = [];
  const impl = {
    async createDirectory() {
      calls.push("createDirectory");
      throw new Error("Target directory does not exist.");
    },
    async upload(source, path, file) {
      calls.push("upload");
      return { path: `${path}/${file.name}` };
    },
  };
  globalThis.foundry = { applications: { apps: { FilePicker: { implementation: impl } } } };
  const file = new File(["x"], "foto.png", { type: "image/png" });

  const response = await uploadFile({ path: "lumenn-phone-hub", file });

  // Criar a pasta é preparatório; o upload é a fonte da verdade. Se a criação
  // falhar, ainda assim tentamos - senão uma mensagem inesperada do Foundry
  // bloquearia um upload que funcionaria.
  assert.deepEqual(calls, ["createDirectory", "upload"]);
  assert.match(response.path, /lumenn-phone-hub\//);
});

test("uploadFile propaga o erro do próprio upload", async () => {
  const impl = {
    async createDirectory() {
      throw new Error("sem permissão");
    },
    async upload() {
      throw new Error("Target directory D:\\data\\lumenn-phone-hub does not exist.");
    },
  };
  globalThis.foundry = { applications: { apps: { FilePicker: { implementation: impl } } } };
  const file = new File(["x"], "foto.png", { type: "image/png" });

  await assert.rejects(
    () => uploadFile({ path: "lumenn-phone-hub", file }),
    /Target directory/,
  );
});

test("uploadFile recusa arquivo que não é File", async () => {
  stubFoundry();
  await assert.rejects(() => uploadFile({ path: "x", file: { name: "a.png" } }));
});

// ---------------------------------------------------------------------------
// openFilePicker - o seletor nunca abria e a Promise nunca liquidava no
// Foundry 14: `FilePicker.pick` não existe, o render precisa de browse() e
// qualquer falha assíncrona era engolida, deixando a Promise pendente.
// ---------------------------------------------------------------------------

class FakeFilePicker {
  static instances = [];

  constructor(options = {}) {
    this.options = options;
    this.callback = options.callback ?? null;
    this.browseCalls = 0;
    this.renderArgs = [];
    this.closeListeners = new Set();
    FakeFilePicker.instances.push(this);
  }

  addEventListener(type, listener) {
    if (type !== "close") {
      throw new Error(`"${type}" não é um evento suportado`);
    }
    this.closeListeners.add(listener);
  }

  // Espelha o FilePicker v13/v14: o primeiro browse carrega o diretório e
  // delega para o render com { force }.
  browse() {
    this.browseCalls += 1;
    return this.render({ force: true });
  }

  render(options) {
    this.renderArgs.push(options);
    return this;
  }

  choose(path) {
    this.callback?.(path, this);
  }

  close() {
    for (const listener of this.closeListeners) listener({ type: "close" });
  }
}

function stubPickerClass(PickerClass) {
  globalThis.foundry = {
    applications: { apps: { FilePicker: { implementation: PickerClass } } },
  };
}

test("openFilePicker abre pelo browse() do core e renderiza com objeto de opções", async () => {
  FakeFilePicker.instances = [];
  stubPickerClass(FakeFilePicker);

  const promise = openFilePicker({ type: "image", current: "" });
  const picker = FakeFilePicker.instances[0];

  assert.equal(picker.browseCalls, 1, "não usou o caminho do core (browse)");
  assert.equal(picker.renderArgs.length, 1);
  // O bug real: render recebia um booleano; o ApplicationV2 espera um objeto
  // de opções. `render(true)` só é coagido por acidente e não é contrato.
  assert.deepEqual(picker.renderArgs[0], { force: true });
  assert.notEqual(picker.renderArgs[0], true);
  assert.equal(picker.options.type, "image");
  assert.equal(typeof picker.options.callback, "function");

  picker.choose("worlds/x/foto.png");
  assert.equal(await promise, "worlds/x/foto.png");
});

test("openFilePicker resolve com o caminho escolhido no callback", async () => {
  FakeFilePicker.instances = [];
  stubPickerClass(FakeFilePicker);

  const promise = openFilePicker({ type: "image" });
  FakeFilePicker.instances[0].choose("worlds/x/foto.png");

  assert.equal(await promise, "worlds/x/foto.png");
});

test("openFilePicker resolve com null quando o picker fecha sem escolha", async () => {
  FakeFilePicker.instances = [];
  stubPickerClass(FakeFilePicker);

  const promise = openFilePicker({ type: "image" });
  FakeFilePicker.instances[0].close();

  assert.equal(await promise, null);
});

test("openFilePicker rejeita quando o FilePicker não existe no ambiente", async () => {
  globalThis.foundry = {};
  await assert.rejects(
    () => openFilePicker({ type: "image" }),
    /FilePicker indisponível/,
  );
});

test("openFilePicker rejeita (não fica pendente) quando render/browse falha", async () => {
  class FailingPicker extends FakeFilePicker {
    browse() {
      return Promise.reject(new Error("manageFiles falhou"));
    }
  }
  stubPickerClass(FailingPicker);

  await assert.rejects(
    () => openFilePicker({ type: "image" }),
    /manageFiles falhou/,
  );
});

test("openFilePicker rejeita (não fica pendente) quando o construtor lança", async () => {
  class ExplodingPicker {
    constructor() {
      throw new Error("construtor quebrou");
    }
  }
  stubPickerClass(ExplodingPicker);

  await assert.rejects(
    () => openFilePicker({ type: "image" }),
    /construtor quebrou/,
  );
});

test("openFilePicker usa render({ force: true }) quando não existe browse (caminho antigo)", async () => {
  class LegacyPicker {
    static instances = [];

    constructor(options = {}) {
      this.options = options;
      LegacyPicker.instances.push(this);
    }

    addEventListener() {}

    render(options) {
      this.renderArgs = [options];
      return this;
    }

    choose(path) {
      this.options.callback?.(path, this);
    }
  }
  stubPickerClass(LegacyPicker);

  const promise = openFilePicker({ type: "audio" });
  const picker = LegacyPicker.instances[0];

  assert.deepEqual(picker.renderArgs, [{ force: true }]);
  assert.notEqual(picker.renderArgs[0], true);

  picker.choose("audio/tema.ogg");
  assert.equal(await promise, "audio/tema.ogg");
});

test("openFilePicker usa a fábrica estática pick quando ela existe", async () => {
  const calls = [];
  class PickPicker {
    static pick(options) {
      calls.push(options);
      return Promise.resolve("worlds/x/foto.png");
    }
  }
  stubPickerClass(PickPicker);

  const picked = await openFilePicker({ type: "image", current: "x" });

  assert.equal(picked, "worlds/x/foto.png");
  assert.deepEqual(calls, [{ type: "image", current: "x" }]);
});

test("openFilePicker resolve null sem abrir quando o usuário não pode navegar", async () => {
  FakeFilePicker.instances = [];
  stubPickerClass(FakeFilePicker);
  globalThis.game = { user: { can: () => false } };

  assert.equal(await openFilePicker({ type: "image" }), null);
  assert.equal(
    FakeFilePicker.instances.length,
    0,
    "instanciou o picker mesmo sem permissão de navegação",
  );
});
