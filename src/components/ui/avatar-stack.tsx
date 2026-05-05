import { Avatar } from "./avatar";

interface AvatarStackProps {
  names: string[];
  max?: number;
  size?: "sm" | "md";
}

// @spec MEET-UI-008
export function AvatarStack({ names, max = 5, size = "sm" }: AvatarStackProps) {
  const visible = names.slice(0, max);
  const overflow = names.length - max;

  return (
    <div className="flex items-center">
      {visible.map((name, i) => (
        <div
          key={name + i}
          className="border-2 border-bg rounded-full"
          style={{ marginLeft: i > 0 ? -6 : 0 }}
        >
          <Avatar name={name} size={size} />
        </div>
      ))}
      {overflow > 0 && (
        <div
          className={`inline-flex items-center justify-center rounded-full font-medium bg-bg-sunken text-ink-3 border-2 border-bg ${size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs"}`}
          style={{ marginLeft: -6 }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
