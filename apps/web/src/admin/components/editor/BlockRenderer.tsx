import { Block } from '../../models/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

// ======================== BLOCK RENDERERS ========================

const HeroBlock = ({ block }: { block: Block }) => (
  <div
    style={{
      padding: block.styles.padding,
      backgroundColor: block.styles.backgroundColor,
      color: block.styles.textColor,
      backgroundImage: block.props.backgroundImage ? `url(${block.props.backgroundImage})` : undefined,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative',
      borderRadius: block.styles.borderRadius,
    }}
  >
    {block.props.overlay && block.props.backgroundImage && (
      <div className="absolute inset-0 bg-black/50 rounded-[inherit]" />
    )}
    <div className="relative z-10 max-w-3xl mx-auto text-center px-4">
      <h1 className="text-3xl md:text-5xl font-bold mb-4">{block.props.title}</h1>
      <p className="text-lg opacity-80 mb-6">{block.props.subtitle}</p>
      {block.props.buttonText && (
        <a
          href={block.props.buttonUrl || '#'}
          className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          {block.props.buttonText}
        </a>
      )}
    </div>
  </div>
);

const TextBlock = ({ block }: { block: Block }) => (
  <div
    style={{ padding: block.styles.padding, textAlign: block.props.alignment as any }}
    className="prose prose-sm max-w-none"
    dangerouslySetInnerHTML={{ __html: block.props.content }}
  />
);

const ImageBlock = ({ block }: { block: Block }) => (
  <div style={{ padding: block.styles.padding }}>
    <img
      src={block.props.src}
      alt={block.props.alt}
      className="w-full max-h-[500px] rounded-xl"
      style={{
        objectFit: block.props.fit || 'cover',
        borderRadius: block.styles.borderRadius,
      }}
    />
    {block.props.caption && (
      <p className="text-sm text-muted-foreground mt-2 text-center">{block.props.caption}</p>
    )}
  </div>
);

const GalleryBlock = ({ block }: { block: Block }) => (
  <div style={{ padding: block.styles.padding }}>
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${block.props.columns || 3}, 1fr)` }}
    >
      {(block.props.images || []).map((img: any, i: number) => (
        <img key={i} src={img.src} alt={img.alt} className="w-full aspect-square object-cover rounded-xl" />
      ))}
    </div>
  </div>
);

const ButtonBlock = ({ block }: { block: Block }) => {
  const variants: Record<string, string> = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'border border-input bg-background hover:bg-accent',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
  };
  return (
    <div style={{ padding: block.styles.padding, textAlign: block.props.alignment as any }}>
      <a
        href={block.props.url || '#'}
        className={`inline-block px-6 py-3 rounded-xl font-medium text-sm transition-colors ${variants[block.props.variant] || variants.primary}`}
      >
        {block.props.text}
      </a>
    </div>
  );
};

const CTABlock = ({ block }: { block: Block }) => (
  <div
    style={{
      padding: block.styles.padding,
      backgroundColor: block.styles.backgroundColor,
      color: block.styles.textColor,
      borderRadius: block.styles.borderRadius,
    }}
    className="text-center px-6"
  >
    <h2 className="text-2xl md:text-3xl font-bold mb-3">{block.props.title}</h2>
    <p className="text-base opacity-80 mb-6 max-w-xl mx-auto">{block.props.description}</p>
    <a href={block.props.buttonUrl || '#'} className="inline-block bg-background text-foreground px-6 py-3 rounded-xl font-medium hover:bg-background/90 transition-colors">
      {block.props.buttonText}
    </a>
  </div>
);

const FeaturesBlock = ({ block }: { block: Block }) => (
  <div style={{ padding: block.styles.padding }}>
    {block.props.title && <h2 className="text-2xl font-bold text-center mb-8">{block.props.title}</h2>}
    <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${block.props.columns || 2}, 1fr)` }}>
      {(block.props.features || []).map((f: any, i: number) => (
        <div key={i} className="bg-muted/50 rounded-2xl p-6">
          <span className="text-3xl mb-3 block">{f.icon}</span>
          <h3 className="font-semibold mb-2">{f.title}</h3>
          <p className="text-sm text-muted-foreground">{f.description}</p>
        </div>
      ))}
    </div>
  </div>
);

const TestimonialsBlock = ({ block }: { block: Block }) => (
  <div style={{ padding: block.styles.padding }}>
    {block.props.title && <h2 className="text-2xl font-bold text-center mb-8">{block.props.title}</h2>}
    <div className="grid md:grid-cols-2 gap-4">
      {(block.props.items || []).map((t: any, i: number) => (
        <div key={i} className="bg-muted/50 rounded-2xl p-6">
          <p className="text-sm mb-4 italic">«{t.text}»</p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
              {t.author?.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium">{t.author}</p>
              <p className="text-xs text-muted-foreground">{t.role}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const FAQBlock = ({ block }: { block: Block }) => (
  <div style={{ padding: block.styles.padding }}>
    {block.props.title && <h2 className="text-2xl font-bold text-center mb-8">{block.props.title}</h2>}
    <Accordion type="single" collapsible className="max-w-2xl mx-auto">
      {(block.props.items || []).map((item: any, i: number) => (
        <AccordionItem key={i} value={`faq-${i}`}>
          <AccordionTrigger className="text-sm font-medium">{item.question}</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground">{item.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  </div>
);

const FormBlock = ({ block }: { block: Block }) => (
  <div style={{ padding: block.styles.padding }} className="max-w-lg mx-auto">
    {block.props.title && <h2 className="text-xl font-bold mb-4">{block.props.title}</h2>}
    <div className="space-y-3">
      {(block.props.fields || []).map((f: any, i: number) => (
        <div key={i}>
          <label className="text-sm font-medium mb-1 block">{f.label}{f.required && ' *'}</label>
          {f.type === 'textarea' ? (
            <textarea className="w-full border rounded-xl px-3 py-2 text-sm bg-background" rows={3} placeholder={f.label} />
          ) : (
            <input type={f.type} className="w-full border rounded-xl px-3 py-2 text-sm bg-background" placeholder={f.label} />
          )}
        </div>
      ))}
      <button className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90">
        {block.props.buttonText || 'Отправить'}
      </button>
    </div>
  </div>
);

const VideoBlock = ({ block }: { block: Block }) => (
  <div style={{ padding: block.styles.padding }}>
    <div className="rounded-xl overflow-hidden" style={{ aspectRatio: block.props.aspectRatio || '16/9' }}>
      <iframe
        src={block.props.url}
        title={block.props.title}
        className="w-full h-full"
        allowFullScreen
      />
    </div>
  </div>
);

const HTMLBlock = ({ block }: { block: Block }) => (
  <div style={{ padding: block.styles.padding }} dangerouslySetInnerHTML={{ __html: block.props.code }} />
);

const ContainerBlock = ({ block, renderBlock }: { block: Block; renderBlock: (b: Block) => React.ReactNode }) => (
  <div
    style={{
      padding: block.styles.padding,
      display: block.styles.display || 'flex',
      flexDirection: (block.styles.flexDirection as any) || 'column',
      alignItems: block.styles.alignItems,
      justifyContent: block.styles.justifyContent,
      gap: block.styles.gap,
      backgroundColor: block.styles.backgroundColor,
      borderRadius: block.styles.borderRadius,
    }}
  >
    {(block.children || []).map(child => renderBlock(child))}
  </div>
);

// ======================== MAIN RENDERER ========================

interface BlockRendererProps {
  block: Block;
}

export default function BlockRenderer({ block }: BlockRendererProps) {
  const renderBlock = (b: Block) => <BlockRenderer key={b.id} block={b} />;

  switch (block.type) {
    case 'hero': return <HeroBlock block={block} />;
    case 'text': return <TextBlock block={block} />;
    case 'image': return <ImageBlock block={block} />;
    case 'gallery': return <GalleryBlock block={block} />;
    case 'button': return <ButtonBlock block={block} />;
    case 'cta': return <CTABlock block={block} />;
    case 'features': return <FeaturesBlock block={block} />;
    case 'testimonials': return <TestimonialsBlock block={block} />;
    case 'faq': return <FAQBlock block={block} />;
    case 'form': return <FormBlock block={block} />;
    case 'video': return <VideoBlock block={block} />;
    case 'html': return <HTMLBlock block={block} />;
    case 'container': return <ContainerBlock block={block} renderBlock={renderBlock} />;
    default: return <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-xl">Неизвестный блок: {block.type}</div>;
  }
}
