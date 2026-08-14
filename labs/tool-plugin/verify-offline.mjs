import { apply, inject } from "./index.js";

const registered = [];
const ctx = {
  tools: {
    register(definition) {
      registered.push(definition);
    },
    schemas() {
      return registered.map(({ name, description, parameters, output }) => ({
        name,
        description,
        parameters,
        output,
      }));
    },
  },
};

if (!Array.isArray(inject) || inject.length !== 1 || inject[0] !== "tools") {
  throw new Error("tool plugin must inject tools");
}

apply(ctx);

const tool = registered.find((item) => item.name === "greet");
if (!tool) throw new Error("greet was not registered");
if (tool.parameters?.type !== "object") throw new Error("tool parameters schema root must have type object");
if (tool.parameters?.required?.[0] !== "name") throw new Error("name is not required");
if (tool.output?.schema?.type !== "string") throw new Error("output schema is not string");

const value = await tool.execute({ name: "Alice" });
if (value !== "Hello, Alice!") throw new Error("unexpected execute result: " + value);

const rendered = tool.output.render({ name: "Alice" }, value);
if (rendered?.[0]?.type !== "text" || rendered?.[0]?.text !== value) {
  throw new Error("output renderer did not preserve the canonical value");
}

console.log("PASS offline tool registration/schema/execute/render; DSH runtime and model invocation NOT_RUN");
