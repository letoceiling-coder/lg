import { type SectionConfig } from '../../store/content-store';
import HeroEditor from './editors/HeroEditor';
import AboutEditor from './editors/AboutEditor';
import ContactsEditor from './editors/ContactsEditor';
import FeaturesEditor from './editors/FeaturesEditor';
import GenericEditor from './editors/GenericEditor';
import PropertyGridEditor from './editors/PropertyGridEditor';
import NewListingsEditor from './editors/NewListingsEditor';
import FooterEditor from './editors/FooterEditor';

interface Props {
  section: SectionConfig;
  onUpdate: (settings: Record<string, any>) => void;
}

export default function SectionEditorForm({ section, onUpdate }: Props) {
  switch (section.type) {
    case 'hero':
      return <HeroEditor settings={section.settings} onUpdate={onUpdate} />;
    case 'about_platform':
      return <AboutEditor settings={section.settings} onUpdate={onUpdate} />;
    case 'contacts':
      return <ContactsEditor settings={section.settings} onUpdate={onUpdate} />;
    case 'additional_features':
      return <FeaturesEditor settings={section.settings} onUpdate={onUpdate} />;
    case 'property_grid':
      return <PropertyGridEditor settings={section.settings} onUpdate={onUpdate} />;
    case 'new_listings':
      return <NewListingsEditor settings={section.settings} onUpdate={onUpdate} />;
    case 'footer':
      return <FooterEditor settings={section.settings} onUpdate={onUpdate} />;
    default:
      return <GenericEditor settings={section.settings} onUpdate={onUpdate} sectionType={section.type} />;
  }
}
