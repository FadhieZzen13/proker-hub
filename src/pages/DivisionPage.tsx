import { useParams } from "react-router-dom";
import { DivisionView } from "@/components/DivisionView";
import { DIVISIONS } from "@/hooks/useProkers";

const DivisionPage = () => {
  const { division } = useParams<{ division: string }>();
  
  if (!division || !DIVISIONS.includes(division as any)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Division not found</p>
      </div>
    );
  }

  return <DivisionView division={division} />;
};

export default DivisionPage;
