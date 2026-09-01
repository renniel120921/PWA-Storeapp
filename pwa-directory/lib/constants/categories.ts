export interface CategoryOption {
  slug: string;
  name: string;
}

export const DIRECTORY_CATEGORIES: CategoryOption[] = [
  { slug: "all", name: "All Apps" },
  { slug: "tools", name: "Tools" },
  { slug: "productivity", name: "Productivity" },
  { slug: "utilities", name: "Utilities" },
  { slug: "games", name: "Games" },
  { slug: "finance", name: "Finance" },
  { slug: "lifestyle", name: "Lifestyle" },
  { slug: "social", name: "Social" },
];

