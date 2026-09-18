"use client";

/*
  The entire Next.js adaptation of catalyst-ui, in one file.

  Every component in the library uses hooks or context, so each one needs to sit on
  the client side of the App Router boundary. The alternative — adding "use client"
  to all 16 vendored files — would make src/catalyst-ui/ differ from upstream in
  sixteen places, and the whole point of vendoring the directory byte-identical is
  that `git diff --no-index` against the library stays empty. A directive here marks
  this module as a client entry, and everything it re-exports joins the client graph
  with it.

  It is also a barrel, which upstream's CLAUDE.md forbids *inside* the library. That
  rule exists so a partial directory copy fails loudly instead of compiling against a
  half-present barrel. This copy is whole and this file lives outside it, so the rule
  is satisfied rather than broken: delete a vendored component and this file stops
  compiling immediately, which is exactly the behaviour the rule is protecting.

  Import from "@/ui" everywhere. Nothing outside this file should reach into
  src/catalyst-ui/ directly.
*/

export { Button } from "./catalyst-ui/components/Button/Button";
export type { ButtonSize, ButtonVariant } from "./catalyst-ui/components/Button/Button";

export { Card } from "./catalyst-ui/components/Card/Card";
export type { CardAs, CardPadding } from "./catalyst-ui/components/Card/Card";

export { Col } from "./catalyst-ui/components/Grid/Col";
export type { GridOffset, GridSpan } from "./catalyst-ui/components/Grid/Col";
export { Row } from "./catalyst-ui/components/Grid/Row";
export type { GridGutter, RowAlign, RowJustify } from "./catalyst-ui/components/Grid/Row";

export { Layout } from "./catalyst-ui/components/Layout/Layout";
export { MenuBar } from "./catalyst-ui/components/MenuBar/MenuBar";
export type { MenuDropdownItem } from "./catalyst-ui/components/MenuBar/MenuBar";

export { Modal } from "./catalyst-ui/components/Modal/Modal";
export type { ModalSize } from "./catalyst-ui/components/Modal/Modal";

export { MultiSelect } from "./catalyst-ui/components/MultiSelect/MultiSelect";
export type { MultiSelectOption } from "./catalyst-ui/components/MultiSelect/MultiSelect";

export { Popover, PopoverSkeleton } from "./catalyst-ui/components/Popover/Popover";
export type { PopoverAlign, PopoverSide } from "./catalyst-ui/components/Popover/Popover";

export { SideNav } from "./catalyst-ui/components/SideNav/SideNav";
export type { SideNavItem } from "./catalyst-ui/components/SideNav/SideNav";

export { Skeleton } from "./catalyst-ui/components/Skeleton/Skeleton";
export type { SkeletonShape } from "./catalyst-ui/components/Skeleton/Skeleton";

export { Tag } from "./catalyst-ui/components/Tag/Tag";
export type { TagColor, TagSize } from "./catalyst-ui/components/Tag/Tag";

export { ThemeToggle } from "./catalyst-ui/components/ThemeToggle/ThemeToggle";

export { Tooltip, TooltipSkeleton } from "./catalyst-ui/components/Tooltip/Tooltip";
export type { TooltipSide } from "./catalyst-ui/components/Tooltip/Tooltip";

export { YearRangePicker } from "./catalyst-ui/components/YearRangePicker/YearRangePicker";

export { ThemeProvider, useTheme } from "./catalyst-ui/theme/ThemeProvider";

/*
  ---------------------------------------------------------------------------
  Sub-components, flattened. Read this before writing <Card.Header>.

  catalyst-ui attaches sub-components to their parent at runtime
  (`Object.assign(CardRoot, { Header, Body, ... })`) — a documented invariant of
  the library. That is invisible to a Server Component.

  A "use client" module reaches the server as a proxy over its NAMED EXPORTS; the
  server never executes the module, so a property assigned inside it does not
  exist. `Card.Header` is therefore `undefined` on the server, `<Card.Header>`
  builds an element whose `type` is undefined, and Card's own
  `hasStructuredCardContent` crashes reading `type.displayName` — a 500 whose
  stack points into the library rather than at the import that caused it.

  Assigning each one to a real named export here fixes it: they become client
  references the server can render. Use these flat names everywhere in this app,
  including inside Client Components where `Card.Header` would also work — one way
  to do it beats two, and nothing then depends on which side of the boundary a
  component happens to sit on today.
  ---------------------------------------------------------------------------
*/
import { Card as CardComposite } from "./catalyst-ui/components/Card/Card";
import { Layout as LayoutComposite } from "./catalyst-ui/components/Layout/Layout";
import { MenuBar as MenuBarComposite } from "./catalyst-ui/components/MenuBar/MenuBar";
import { Modal as ModalComposite } from "./catalyst-ui/components/Modal/Modal";
import { SideNav as SideNavComposite } from "./catalyst-ui/components/SideNav/SideNav";

export const CardHeader = CardComposite.Header;
export const CardTitle = CardComposite.Title;
export const CardDescription = CardComposite.Description;
export const CardBody = CardComposite.Body;
export const CardFooter = CardComposite.Footer;
export const CardSkeleton = CardComposite.Skeleton;

export const LayoutHeader = LayoutComposite.Header;
export const LayoutSider = LayoutComposite.Sider;
export const LayoutContent = LayoutComposite.Content;
export const LayoutFooter = LayoutComposite.Footer;

export const MenuBarBrand = MenuBarComposite.Brand;
export const MenuBarNav = MenuBarComposite.Nav;
export const MenuBarLink = MenuBarComposite.Link;
export const MenuBarDropdown = MenuBarComposite.Dropdown;
export const MenuBarActions = MenuBarComposite.Actions;
export const MenuBarSkeleton = MenuBarComposite.Skeleton;

export const ModalHeader = ModalComposite.Header;
export const ModalTitle = ModalComposite.Title;
export const ModalBody = ModalComposite.Body;
export const ModalFooter = ModalComposite.Footer;
export const ModalSkeleton = ModalComposite.Skeleton;

export const SideNavSkeleton = SideNavComposite.Skeleton;
