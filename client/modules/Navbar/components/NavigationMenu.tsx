import NavItem, { Item } from './NavItem';

interface NavigationMenuProps {
    navItems: Item[];
    activeItem: string;
    onNavItemClick: (url: string) => void;
}

const NavigationMenu = ({
    navItems,
    activeItem,
    onNavItemClick,
}: NavigationMenuProps) => {
    return (
        <div className="flex h-16 items-center justify-around">
            {navItems.map((item) => (
                <NavItem
                    key={item.url}
                    item={item}
                    isActive={activeItem === item.url}
                    onClick={onNavItemClick}
                />
            ))}
        </div>
    );
};

export default NavigationMenu;
