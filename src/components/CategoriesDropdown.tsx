"use client";

import Link from "next/link";
import styles from "./Navbar.module.css";
import { ChevronDown } from "lucide-react";

export default function CategoriesDropdown({ categories }: { categories: any[] }) {
  if (!categories || categories.length === 0) return null;

  return (
    <div className={styles.dropdownContainer}>
      <button className={styles.dropdownTrigger}>
        Categories <ChevronDown size={16} />
      </button>
      <div className={styles.dropdownMenu}>
        {categories.map((cat) => (
          <Link 
            key={cat.id} 
            href={`/category/${encodeURIComponent(cat.name)}`}
            className={styles.dropdownItem}
          >
            {cat.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
