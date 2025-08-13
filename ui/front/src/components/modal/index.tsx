import { type ConfirmDialogProps } from './ConfirmDialog';
import OriginModal from './Modal';
import confirm from './confirm';

export type ModalFunc = (props: ConfirmDialogProps) => {
  destroy: () => void;
  update: (configUpdate: ConfirmDialogProps) => void;
};
type ModalStaticFunctions = Record<'confirm', ModalFunc>;
type ModalType = typeof OriginModal;

const Modal = OriginModal as ModalType & ModalStaticFunctions;

Modal.confirm = confirm;

export default Modal;
