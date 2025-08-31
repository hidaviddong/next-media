import { type ComponentProps, Fragment, type ReactNode } from "react";
import type { Key } from "ts-key-enum";
import { cn } from "@/lib/utils";

const DefaultKbdSeparator = ({
  className,
  children = "+",
  ...props
}: ComponentProps<"span">) => (
  <span className={className} {...props}>
    {children}
  </span>
);

export type KbdProps = ComponentProps<"span"> & {
  separator?: ReactNode;
};

export const Kbd = ({
  className,
  separator = <DefaultKbdSeparator />,
  children,
  ...props
}: KbdProps) => (
  <span
    className={cn(
      "inline-flex select-none items-center gap-1 rounded px-1.5 align-middle font-medium font-mono text-[10px] leading-loose",
      className
    )}
    {...props}
  >
    {Array.isArray(children)
      ? children.map((child, index) => (
          <Fragment key={index}>
            {child}
            {index < children.length - 1 && separator}
          </Fragment>
        ))
      : children}
  </span>
);

export type KbdKeyProps = Omit<ComponentProps<"kbd">, "aria-label"> & {
  "aria-label"?: keyof typeof Key | (string & {});
};

export const KbdKey = ({ className, ...props }: KbdKeyProps) => (
  <kbd {...props} className={className} />
);
