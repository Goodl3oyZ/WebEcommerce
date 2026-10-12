import classNames from "classnames";

/** Page-width wrapper: one content width and gutter for the whole storefront. */
export default function Container({ as: Tag = "div", className, children, ...props }) {
  return (
    <Tag className={classNames("mx-auto w-full max-w-content px-4 sm:px-6 lg:px-8", className)} {...props}>
      {children}
    </Tag>
  );
}
