const workspaceRoot = new URL(".", import.meta.url).pathname;

export default {
  root: workspaceRoot,
  test: {
    environment: "node",
    include: ["tests/specs/**/*.test.ts"],
    passWithNoTests: false,
  },
};
