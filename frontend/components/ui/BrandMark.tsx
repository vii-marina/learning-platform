type BrandMarkProps = {
  className?: string;
  alt?: string;
  large?: boolean;
};

export function BrandMark({
  className = "h-9 w-9",
  alt = "",
  large = false,
}: BrandMarkProps) {
  return (
    <img
      src={large ? "/logo-512.png" : "/logo.png"}
      alt={alt}
      width={large ? 512 : 160}
      height={large ? 516 : 161}
      draggable={false}
      className={`shrink-0 select-none object-contain ${className}`}
    />
  );
}
