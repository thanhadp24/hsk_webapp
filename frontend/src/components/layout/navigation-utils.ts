export function resolveNavHref(href: string, levelId?: number) {
  if (!href.startsWith("/learn/") || !levelId) {
    return href;
  }

  return href
    .replace("/learn/vocabulary", `/hsk/${levelId}/vocabulary`)
    .replace("/learn/grammar", `/hsk/${levelId}/grammar`)
    .replace("/learn/flashcards", `/hsk/${levelId}/flashcards`)
    .replace("/learn/visual-learning", `/hsk/${levelId}/visual-learning`)
    .replace("/learn/exercises", `/hsk/${levelId}/exercises`);
}

export function isActiveNavPath(pathname: string, href: string, itemHref = href) {
  if (href === "/hsk") {
    return pathname === "/hsk";
  }

  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  if (itemHref === "/learn/vocabulary" && pathname.startsWith("/vocabularies/")) {
    return true;
  }

  if (itemHref === "/learn/grammar" && pathname.startsWith("/grammar-points/")) {
    return true;
  }

  if (itemHref === "/learn/exercises" && pathname.startsWith("/exercises/")) {
    return true;
  }

  if (itemHref === "/exercise-history" && pathname.startsWith("/exercise-attempts/")) {
    return true;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
