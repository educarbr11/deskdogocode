/// <reference types="pxt-core/localtypings/pxtblockly" />
declare const pxtblockly: pxt.blocks.PxtBlockly;
export declare class FieldPinPicker extends pxtblockly.FieldGridPicker {
    protected warningVisible: boolean;
    init(): void;
    private changeListener;
    protected doValueUpdate_(newValue: string): void;
    protected updateWarning(): void;
    protected showWarning(pin: string): void;
    protected hideWarning(): void;
    dispose(): void;
}
export {};
