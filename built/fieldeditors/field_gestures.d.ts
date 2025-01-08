/// <reference types="pxt-core/localtypings/pxtblockly" />
declare const pxtblockly: pxt.blocks.PxtBlockly;
export interface FieldGesturesOptions {
    columns?: string;
    width?: string;
}
export declare class FieldGestures extends pxtblockly.FieldImages {
    isFieldCustom_: boolean;
    constructor(text: string, options: FieldGesturesOptions, validator?: Function);
    protected render_(): void;
    /** Renders the selected option, which must be text. */
    protected renderSelectedText_(): void;
    positionSVGArrow_(x: number, y: number): number;
    protected getSvgArrow(): SVGImageElement;
}
export {};
