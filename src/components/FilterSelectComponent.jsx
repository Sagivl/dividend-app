import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";

const FilterSelectComponent = ({ activeTab, setActiveTab, filterOptions }) => {
  return (
      <Select value={activeTab} onValueChange={setActiveTab}>
        <SelectTrigger className="w-full text-sm bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 focus:ring-green-500"> {/* Focus ring */}
          <Filter className="h-4 w-4 mr-2 text-slate-400" />
          <SelectValue placeholder="Filter stocks..." />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700 text-slate-300">
          {filterOptions.map(option => (
            <SelectItem 
              key={option.value} 
              value={option.value} 
              className="text-sm focus:bg-slate-700 focus:text-green-300 data-[state=checked]:bg-[#3FB923] data-[state=checked]:text-white" /* Checked item color */
            >
              {option.label} ({option.count})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
  );
};
export default FilterSelectComponent;