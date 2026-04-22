const ToastStyles = () => {
  return (
    <style>{`
      @keyframes toastIn {
        from { opacity: 0; transform: translateX(20px) scale(0.96); }
        to   { opacity: 1; transform: translateX(0) scale(1); }
      }
      @keyframes toastOut {
        from { opacity: 1; transform: translateX(0) scale(1); }
        to   { opacity: 0; transform: translateX(20px) scale(0.96); }
      }
      @keyframes progress {
        from { width: 100%; }
        to   { width: 0%; }
      }
    `}</style>
  );
};

export default ToastStyles;
