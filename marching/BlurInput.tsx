import * as React from 'react';

export const BlurInput = ({
    value,
    onChange,
    validate,
}: {
    value: string;
    onChange: (n: string) => void;
    validate?: (n: string) => boolean;
}) => {
    const [text, setText] = React.useState(null as null | string);
    return (
        <input
            value={text ?? value}
            onChange={(evt) => {
                setText(evt.target.value);
            }}
            onKeyDown={(evt) => {
                if (evt.key === 'Enter' || evt.key === 'Return') {
                    if (text) {
                        if (!validate || validate(text)) {
                            onChange(text);
                        }
                    }
                }
            }}
            onBlur={() => {
                if (text) {
                    if ((!validate || validate(text)) && text !== value) {
                        onChange(text);
                    }
                }
                setText(null);
            }}
        />
    );
};

export const BlurNumber = ({
    value,
    onChange,
    validate,
}: {
    value: number;
    onChange: (n: number) => void;
    validate?: (n: number) => boolean;
}) => {
    const [text, setText] = React.useState(null as null | string);
    return (
        <input
            value={text ?? value}
            onChange={(evt) => {
                setText(evt.target.value);
            }}
            onKeyDown={(evt) => {
                if (evt.key === 'Enter' || evt.key === 'Return') {
                    if (text) {
                        const v = +text;
                        if (!isNaN(v) && (!validate || validate(v))) {
                            onChange(v);
                        }
                    }
                }
            }}
            onBlur={() => {
                if (text) {
                    const v = +text;
                    if (
                        !isNaN(v) &&
                        (!validate || validate(v)) &&
                        v !== value
                    ) {
                        onChange(v);
                    }
                }
                setText(null);
            }}
        />
    );
};
