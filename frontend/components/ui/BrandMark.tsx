type BrandMarkProps = {
  /** Tailwind sizing classes; the mark is square-ish, so pass a matching h-/w- pair. */
  className?: string;
  /**
   * Left empty by default: every brand surface renders the "EduCat" wordmark next
   * to the mark, so the image is decorative there and a filled alt would make
   * screen readers announce the name twice.
   */
  alt?: string;
};

/**
 * The EduCat mascot mark. Every brand surface goes through this component, so
 * replacing the logo means replacing `public/logo.png` and nothing else.
 */
export function BrandMark({ className = "h-9 w-9", alt = "" }: BrandMarkProps) {
  return (
    <img
      src="/logo.png"
      alt={alt}
      width={160}
      height={161}
      draggable={false}
      className={`shrink-0 select-none object-contain ${className}`}
    />
  );
}
