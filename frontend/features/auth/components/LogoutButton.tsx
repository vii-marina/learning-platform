import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { Button } from "../../../components/ui/button";
import { clearAdminDashboardCache } from "../../admin-dashboard/api/adminDashboardApi";
import { clearCurrentUserCache } from "../api/authApi";

type LogoutButtonProps = {
  containerClassName?: string;
  buttonClassName?: string;
  buttonVariant?: "primary" | "secondary" | "ghost";
  contentClassName?: string;
  content?: ReactNode;
};

export function LogoutButton({
  containerClassName = "flex flex-col items-center gap-3",
  buttonClassName = "min-w-32 rounded-xl px-5 py-3",
  buttonVariant = "primary",
  contentClassName = "",
  content,
}: LogoutButtonProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogout = async () => {
    setIsSubmitting(true);
    setMessage("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    clearCurrentUserCache();
    clearAdminDashboardCache();
    navigate("/login", { replace: true });
  };

  return (
    <div className={containerClassName}>
      <Button
        type="button"
        onClick={handleLogout}
        disabled={isSubmitting}
        variant={buttonVariant}
        className={buttonClassName}
      >
        <span className={contentClassName}>
          {isSubmitting ? "Вихід..." : content ?? "Вийти"}
        </span>
      </Button>
      {message ? <p className="text-sm text-rose-600">{message}</p> : null}
    </div>
  );
}
