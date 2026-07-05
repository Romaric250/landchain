import Image from "next/image";
import { Link } from "@/i18n/navigation";

interface LandChainLogoProps {
  size?: number;
  showName?: boolean;
  nameClassName?: string;
  className?: string;
  href?: string;
  priority?: boolean;
}

export function LandChainLogo({
  size = 36,
  showName = false,
  nameClassName = "text-lg font-extrabold tracking-tight text-primary",
  className = "",
  href,
  priority = false,
}: LandChainLogoProps) {
  const img = (
    <Image
      src="/landchain.png"
      alt="LandChain"
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
      priority={priority}
    />
  );

  const content = showName ? (
    <span className="flex items-center gap-2.5">
      {img}
      <span className={nameClassName}>LandChain</span>
    </span>
  ) : (
    img
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}
