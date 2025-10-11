import unitCss from "./Units.module.css";

export const Unit = ({ children }: { children: React.ReactNode }) => (
  <span className={unitCss.unit}>{children}</span>
);

export const Sup = ({ children }: { children: React.ReactNode }) => (
  <sup className={unitCss.sup}>{children}</sup>
);
