const LoadingSkeleton = ({ variant = 'card', count = 1 }) => {
  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return (
          <div className="bg-theme-card/30 backdrop-blur-sm rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-theme-primary/20 rounded w-3/4 mb-4"></div>
            <div className="h-3 bg-theme-primary/20 rounded w-full mb-2"></div>
            <div className="h-3 bg-theme-primary/20 rounded w-5/6"></div>
          </div>
        );

      case 'table-row':
        return (
          <tr className="animate-pulse">
            <td className="px-6 py-4">
              <div className="h-4 bg-theme-primary/20 rounded w-24"></div>
            </td>
            <td className="px-6 py-4">
              <div className="h-4 bg-theme-primary/20 rounded w-32"></div>
            </td>
            <td className="px-6 py-4">
              <div className="h-4 bg-theme-primary/20 rounded w-20"></div>
            </td>
          </tr>
        );

      case 'list-item':
        return (
          <div className="flex items-center gap-4 p-4 bg-theme-card/30 backdrop-blur-sm rounded-lg animate-pulse">
            <div className="w-12 h-12 bg-theme-primary/20 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-theme-primary/20 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-theme-primary/20 rounded w-1/2"></div>
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-theme-primary/20 rounded w-full"></div>
            <div className="h-4 bg-theme-primary/20 rounded w-5/6"></div>
            <div className="h-4 bg-theme-primary/20 rounded w-4/6"></div>
          </div>
        );

      default:
        return (
          <div className="animate-pulse">
            <div className="h-8 bg-theme-primary/20 rounded w-full"></div>
          </div>
        );
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>{renderSkeleton()}</div>
      ))}
    </>
  );
};

export default LoadingSkeleton;