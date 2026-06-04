/**
 * Registers StaticMath, MathField, InnerMathField API classes.
 * This must be called after all commands/symbols are registered,
 * and after API and RootBlockMixin are defined in publicapi.ts.
 */
import { API, RootBlockMixin } from '../publicapi';
import { MathBlock, RootMathBlock } from './math';
import { domFrag } from '../domFragment';
import { pray, noop } from '../utils';
import type { MQNode } from '../services/mqnode';
import type { Controller } from '../services/textarea';

RootBlockMixin(RootMathBlock.prototype);

API.StaticMath = function (APIClasses: APIClasses) {
  return class StaticMath extends APIClasses.AbstractMathQuill {
    innerFields: InnerFields;
    static RootBlock = MathBlock;

    __mathquillify(opts: ConfigOptions, _interfaceVersion: number) {
      this.config(opts as MathQuill.v3.Config);
      // `mathquillify` calls `createTextarea`
      super.mathquillify('mq-math-mode');
      if (this.__options.enableDigitGrouping) {
        this.__controller.root.domFrag().addClass('mq-show-grouping');
      }
      this.__controller.setupStaticField();
      if (this.__options.mouseEvents) {
        this.__controller.addMouseEventListener();
      }
      // The textarea is initialized (`createTextarea` called) by this point.
      this.__controller.staticMathTextareaEvents();
      return this;
    }
    constructor(el: Controller) {
      super(el);
      var innerFields = (this.innerFields = []);
      this.__controller.root.postOrder(function (node: MQNode) {
        node.registerInnerField(innerFields, APIClasses.InnerMathField);
      });
    }
    latex(s: string): this;
    latex(): string;
    latex(_latex?: string): string | this {
      var returned = super.latex.apply(this, arguments as unknown as any);
      if (arguments.length > 0) {
        var innerFields = (this.innerFields = []);
        this.__controller.root.postOrder(function (node: MQNode) {
          node.registerInnerField(innerFields, APIClasses.InnerMathField);
        });
        // Force an ARIA label update to remain in sync with the new LaTeX value.
        this.__controller.updateMathspeak();
      }
      return returned;
    }
    setAriaLabel(ariaLabel: string) {
      this.__controller.setAriaLabel(ariaLabel);
      return this;
    }
    getAriaLabel() {
      return this.__controller.getAriaLabel();
    }
  };
};

API.MathField = function (APIClasses: APIClasses) {
  return class MathField extends APIClasses.EditableField {
    static RootBlock = RootMathBlock;

    __mathquillify(opts: ConfigOptions, interfaceVersion: number) {
      this.config(opts as MathQuill.v3.Config);
      if (interfaceVersion > 1) this.__controller.root.reflow = noop;
      super.mathquillify('mq-editable-field mq-math-mode');
      // TODO: Why does this need to be deleted (contrary to the type definition)? Could we set it to `noop` instead?
      delete (this.__controller.root as any).reflow;
      return this;
    }
  };
};

API.InnerMathField = function (APIClasses: APIClasses) {
  pray('MathField class is defined', APIClasses.MathField);
  return class extends APIClasses.MathField {
    makeStatic() {
      this.__controller.editable = false;
      this.__controller.root.blur();
      this.__controller.unbindEditablesEvents();
      domFrag(this.__controller.container).removeClass('mq-editable-field');
    }
    makeEditable() {
      this.__controller.editable = true;
      this.__controller.editablesTextareaEvents();
      this.__controller.cursor.insAtRightEnd(this.__controller.root);
      domFrag(this.__controller.container).addClass('mq-editable-field');
    }
  };
};
