type AdminTeacherAvatarProps = {
  name: string;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "h-12 w-12 text-base",
  md: "h-16 w-16 text-xl",
  lg: "h-28 w-28 text-3xl",
} satisfies Record<NonNullable<AdminTeacherAvatarProps["size"]>, string>;

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "T";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function AdminTeacherAvatar({
  name,
  size = "md",
}: AdminTeacherAvatarProps) {
  const classes = sizeClasses[size];

  return (
    <div
      className={`flex items-center justify-center rounded-full border-4 border-[#dbeafe] bg-[linear-gradient(135deg,#13daec_0%,#7c3aed_100%)] font-black text-white ${classes}`}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  );
}
