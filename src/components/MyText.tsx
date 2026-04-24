import React from 'react';

interface HTextProps {
  variant: 'h1' | 'h2' | 'h3' | 'h4' | 'h5';
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

interface PTextProps {
  variant?: 'normal' | 'small' | 'span';
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

const getFontSize = (variant: HTextProps['variant']): number => {
  switch (variant) {
    case 'h1':
      return 48;
    case 'h2':
      return 40;
    case 'h3':
      return 36;
    case 'h4':
      return 24;
    case 'h5':
      return 18;
    default:
      return 18;
  }
};

const getMarginBottom = (variant: HTextProps['variant']): number => {
  switch (variant) {
    case 'h1':
      return 8;
    case 'h2':
      return 8;
    case 'h3':
      return 4;
    case 'h4':
      return 4;
    case 'h5':
      return 4;
    default:
      return 4;
  }
};

export const HText: React.FC<HTextProps> = ({ variant, children, style, className }) => {
  const fontSize = getFontSize(variant);
  const marginBottom = getMarginBottom(variant);
  return (
    <div
      style={{
        fontSize: fontSize,
        fontWeight: 700,
        marginBottom: marginBottom,
        ...style,
      }}
      className={className}
    >
      {children}
    </div>
  );
};

export const PText: React.FC<PTextProps> = ({
  variant = 'normal',
  children,
  style,
  className,
}) => {
  const getFontSize = (variant: PTextProps['variant']): string => {
    switch (variant) {
      case 'span':
        return '12px';
      case 'small':
        return '14px';
      case 'normal':
      default:
        return '16px';
    }
  };

  return (
    <p
      style={{
        fontSize: getFontSize(variant),
        marginBottom: 4,
        color: '#888',
        ...style,
      }}
      className={className}
    >
      {children}
    </p>
  );
};
