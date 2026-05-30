import { SearchPill } from "@/components/ui/SearchPill";

interface SearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
  onClear: () => void;
}

export const SearchBar = ({ value, onChangeText, onClear }: SearchBarProps) => {
  return (
    <SearchPill
      accessibilityLabel="Search expenses"
      placeholder="Search merchant or note"
      value={value}
      onChangeText={onChangeText}
      onClear={onClear}
    />
  );
};
