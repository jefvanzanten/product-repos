type ClassNameMap<K extends string> = Readonly<Record<K, string>>;

export type AdminCssModule = {
  readonly scope: string;
  readonly css: string;
};

export function cssModule<const K extends string>(scope: string, classNames: readonly K[]): ClassNameMap<K> {
  return Object.fromEntries(classNames.map((className) => [className, scopedClassName(scope, className)])) as ClassNameMap<K>;
}

export function renderAdminCss(modules: readonly AdminCssModule[]): string {
  const chunks = modules.map((module) => `/* ${module.scope} */\n${scopeCssClasses(module.scope, module.css)}`);
  return `${chunks.join("\n\n")}\n`;
}

function scopedClassName(scope: string, className: string): string {
  return `${scope}_${className}`;
}

function scopeCssClasses(scope: string, css: string): string {
  return css.replace(/\.([_a-zA-Z][_a-zA-Z0-9-]*)/g, (_match, className: string) => `.${scopedClassName(scope, className)}`);
}
