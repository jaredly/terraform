// My little framework
const node = (name, attrs, children) => {
    const add = (child) => {
        if (child == null) {
            return;
        } else if (Array.isArray(child)) {
            child.forEach(add);
        } else if (
            typeof child === 'string' ||
            typeof child === 'number' ||
            typeof child === 'boolean'
        ) {
            node.appendChild(document.createTextNode('' + child));
        } else {
            // TODO check, and warn otherwise
            node.appendChild(child);
        }
    };
    const node = document.createElement(name);
    if (attrs) {
        Object.keys(attrs).forEach((k) => {
            if (k === 'style') {
                Object.assign(node.style, attrs[k]);
            } else if (typeof attrs[k] === 'function') {
                node[k] = function () {
                    attrs[k].apply(node, arguments);
                }; // todo addeventlistener maybe?
            } else if (['checked'].includes(k)) {
                node[k] = attrs[k];
            } else {
                node.setAttribute(k, attrs[k]);
            }
        });
    }
    add(children);
    return node;
};
const named = (name) => (attrs, children) => node(name, attrs, children);
const div = named('div');
const span = named('span');
const button = named('button');
const render = (dest, node) => {
    dest.innerHTML = '';
    dest.appendChild(node);
};
// done with framework
