import { useState, useMemo } from "react";

export interface Category {
  id: string;
  label: string;
  jname?: string;
  myname?: string;
  score: number;
}

interface Params {
  initialAvailableCategories: Category[];
  initialSelectedCategories: string[];
}

export function useCategoryState({
  initialAvailableCategories,
  initialSelectedCategories,
}: Params) {
  const [categories, setCategories] = useState<Category[]>(
    initialAvailableCategories
  );

  const [selected, setSelected] = useState<string[]>(
    initialSelectedCategories
  );

  const [visibleCount, setVisibleCount] = useState(5);

  const [categoryReady, setCategoryReady] = useState(
    initialAvailableCategories.length > 0
  );

  const handleSelectCategory = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const ordered = useMemo(() => {
    return [
      ...categories.filter((c) => selected.includes(c.id)),
      ...categories.filter((c) => !selected.includes(c.id)),
    ];
  }, [categories, selected]);

  const visibleCats = useMemo(() => {
    return ordered.slice(0, visibleCount);
  }, [ordered, visibleCount]);

  return {
    categories,
    setCategories,
    selected,
    setSelected,
    visibleCount,
    setVisibleCount,
    categoryReady,
    setCategoryReady,
    handleSelectCategory,
    ordered,
    visibleCats,
  };
}
