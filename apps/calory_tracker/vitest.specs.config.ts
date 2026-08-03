const workspaceRoot = new URL("../../", import.meta.url).pathname;

export default {
  root: workspaceRoot,
  test: {
    environment: "node",
    include: ["apps/calory_tracker/tests/specs/**/*.test.ts"],
    passWithNoTests: false,
  },
};
