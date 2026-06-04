import { NodeBase } from '../tree';
import { L, R, pray } from '../utils';
import type { Direction } from '../utils';
import type { Controller } from './textarea';
import type { Cursor } from '../cursor';

export class MQNode extends NodeBase {
  keystroke(key: string, e: KeyboardEvent | undefined, ctrlr: Controller) {
    var cursor = ctrlr.cursor;

    switch (key) {
      case 'Ctrl-Shift-Backspace':
      case 'Ctrl-Backspace':
        ctrlr.ctrlDeleteDir(L);
        break;

      case 'Shift-Backspace':
      case 'Backspace':
        ctrlr.backspace();
        break;

      // Tab or Esc -> go one block right if it exists, else escape right.
      case 'Esc':
      case 'Tab':
        ctrlr.escapeDir(R, key, e);
        return;

      // Shift-Tab -> go one block left if it exists, else escape left.
      case 'Shift-Tab':
      case 'Shift-Esc':
        ctrlr.escapeDir(L, key, e);
        return;

      // End -> move to the end of the current block.
      case 'End':
        ctrlr.notify('move').cursor.insAtRightEnd(cursor.parent);
        ctrlr.aria.queue('end of').queue(cursor.parent, true);
        break;

      // Ctrl-End -> move all the way to the end of the root block.
      case 'Ctrl-End':
        ctrlr.notify('move').cursor.insAtRightEnd(ctrlr.root);
        ctrlr.aria
          .queue('end of')
          .queue(ctrlr.ariaLabel)
          .queue(ctrlr.root)
          .queue(ctrlr.ariaPostLabel);
        break;

      // Shift-End -> select to the end of the current block.
      case 'Shift-End':
        ctrlr.selectToBlockEndInDir(R);
        break;

      // Ctrl-Shift-End -> select all the way to the end of the root block.
      case 'Ctrl-Shift-End':
        ctrlr.selectToRootEndInDir(R);
        break;

      // Home -> move to the start of the current block.
      case 'Home':
        ctrlr.notify('move').cursor.insAtLeftEnd(cursor.parent);
        ctrlr.aria.queue('beginning of').queue(cursor.parent, true);
        break;

      // Ctrl-Home -> move all the way to the start of the root block.
      case 'Ctrl-Home':
        ctrlr.notify('move').cursor.insAtLeftEnd(ctrlr.root);
        ctrlr.aria
          .queue('beginning of')
          .queue(ctrlr.ariaLabel)
          .queue(ctrlr.root)
          .queue(ctrlr.ariaPostLabel);
        break;

      // Shift-Home -> select to the start of the current block.
      case 'Shift-Home':
        ctrlr.selectToBlockEndInDir(L);
        break;

      // Ctrl-Shift-Home -> select all the way to the start of the root block.
      case 'Ctrl-Shift-Home':
        ctrlr.selectToRootEndInDir(L);
        break;

      case 'Left':
        ctrlr.moveLeft();
        break;
      case 'Shift-Left':
        ctrlr.selectLeft();
        break;
      case 'Ctrl-Left':
        break;

      case 'Right':
        ctrlr.moveRight();
        break;
      case 'Shift-Right':
        ctrlr.selectRight();
        break;
      case 'Ctrl-Right':
        break;

      case 'Up':
        ctrlr.moveUp();
        break;
      case 'Down':
        ctrlr.moveDown();
        break;

      case 'Shift-Up':
        ctrlr.withIncrementalSelection((selectDir) => {
          if (cursor[L]) {
            while (cursor[L]) selectDir(L);
          } else {
            selectDir(L);
          }
        });
        break;

      case 'Shift-Down':
        ctrlr.withIncrementalSelection((selectDir) => {
          if (cursor[R]) {
            while (cursor[R]) selectDir(R);
          } else {
            selectDir(R);
          }
        });
        break;

      case 'Ctrl-Up':
        break;
      case 'Ctrl-Down':
        break;

      case 'Ctrl-Shift-Del':
      case 'Ctrl-Del':
        ctrlr.ctrlDeleteDir(R);
        break;

      case 'Shift-Del':
      case 'Del':
        ctrlr.deleteForward();
        break;

      case 'Meta-A':
      case 'Ctrl-A':
        ctrlr.selectAll();
        break;

      // These remaining hotkeys are only of benefit to people running screen readers.
      case 'Ctrl-Alt-Up': // speak parent block that has focus
        if (cursor.parent.parent && cursor.parent.parent instanceof MQNode)
          ctrlr.aria.queue(cursor.parent.parent);
        else ctrlr.aria.queue('nothing above');
        break;

      case 'Ctrl-Alt-Down': // speak current block that has focus
        if (cursor.parent && cursor.parent instanceof MQNode)
          ctrlr.aria.queue(cursor.parent);
        else ctrlr.aria.queue('block is empty');
        break;

      case 'Ctrl-Alt-Left': // speak left-adjacent block
        if (cursor.parent.parent && cursor.parent.parent.getEnd(L)) {
          ctrlr.aria.queue(cursor.parent.parent.getEnd(L));
        } else {
          ctrlr.aria.queue('nothing to the left');
        }
        break;

      case 'Ctrl-Alt-Right': // speak right-adjacent block
        if (cursor.parent.parent && cursor.parent.parent.getEnd(R)) {
          ctrlr.aria.queue(cursor.parent.parent.getEnd(R));
        } else {
          ctrlr.aria.queue('nothing to the right');
        }
        break;

      case 'Ctrl-Alt-Shift-Down': // speak selection
        if (cursor.selection)
          ctrlr.aria.queue(
            cursor.selection.join('mathspeak', ' ').trim() + ' selected'
          );
        else ctrlr.aria.queue('nothing selected');
        break;

      case 'Ctrl-Alt-=':
      case 'Ctrl-Alt-Shift-Right': // speak ARIA post label (evaluation or error)
        if (ctrlr.ariaPostLabel.length) ctrlr.aria.queue(ctrlr.ariaPostLabel);
        else ctrlr.aria.queue('no answer');
        break;

      default:
        return;
    }
    ctrlr.aria.alert();
    e?.preventDefault();
    ctrlr.scrollHoriz();
  }

  moveOutOf(_dir: Direction, _cursor: Cursor, _updown?: 'up' | 'down') {
    pray('overridden or never called on this node', false);
  } // called by Controller::escapeDir, moveDir
  moveTowards(_dir: Direction, _cursor: Cursor, _updown?: 'up' | 'down') {
    pray('overridden or never called on this node', false);
  } // called by Controller::moveDir
  deleteOutOf(_dir: Direction, _cursor: Cursor) {
    pray('overridden or never called on this node', false);
  } // called by Controller::deleteDir
  deleteTowards(_dir: Direction, _cursor: Cursor) {
    pray('overridden or never called on this node', false);
  } // called by Controller::deleteDir
  unselectInto(_dir: Direction, _cursor: Cursor) {
    pray('overridden or never called on this node', false);
  } // called by Controller::selectDir
  selectOutOf(_dir: Direction, _cursor: Cursor) {
    pray('overridden or never called on this node', false);
  } // called by Controller::selectDir
  selectTowards(_dir: Direction, _cursor: Cursor) {
    pray('overridden or never called on this node', false);
  } // called by Controller::selectDir
}

export function isMQNodeClass(cmd: any): cmd is typeof MQNode {
  return cmd && cmd.prototype instanceof MQNode;
}
