import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  greenText?: string;
  description?: string;
  centered?: boolean;
  className?: string;
}

export default function SectionHeading({
  eyebrow,
  title,
  greenText,
  description,
  centered = false,
  className,
}: SectionHeadingProps) {
  /* Split title around greenText so we can colour the matching fragment */
  const renderTitle = () => {
    if (!greenText) return title;

    const index = title.indexOf(greenText);
    if (index === -1) return title;

    const before = title.slice(0, index);
    const after = title.slice(index + greenText.length);

    return (
      <>
        {before}
        <span className="text-green">{greenText}</span>
        {after}
      </>
    );
  };

  return (
    <div
      className={cn(
        "max-w-3xl",
        centered && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow && (
        <span className="mb-4 inline-block rounded-full bg-green/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-green">
          {eyebrow}
        </span>
      )}

      <h2 className="font-heading text-3xl font-extrabold leading-tight text-ink md:text-4xl lg:text-5xl">
        {renderTitle()}
      </h2>

      {description && (
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
          {description}
        </p>
      )}
    </div>
  );
}
