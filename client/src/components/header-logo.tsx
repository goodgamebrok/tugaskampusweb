// Logo dipakai di header/sidebar. Import dari assets agar path terbundle dan pasti jalan.
import logoSrc from "@/assets/kingvyperslogo.png";

export const headerLogoSrc = logoSrc;

type Props = {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
};

const sizeClass = {
  sm: "h-12 w-auto",
  md: "h-14 w-auto",
  lg: "h-16 w-auto",
  xl: "h-24 w-auto",
};

export function HeaderLogo({ className = "", size = "md" }: Props) {
  return (
    <img
      src={headerLogoSrc}
      alt="King Vypers"
      className={`object-contain ${sizeClass[size]} ${className}`}
    />
  );
}
