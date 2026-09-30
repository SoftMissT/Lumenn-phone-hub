import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { uploadFile } from "../scripts/compat/file-picker-compat.mjs";

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
