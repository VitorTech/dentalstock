/**
 * Políticas de nível de estoque de um item do catálogo.
 *
 * Moram no catálogo porque `stock` e `minStock` são atributos do próprio item:
 * assim qualquer módulo posterior — e a interface do catálogo — usa a mesma
 * regra, sem reescrever `stock <= minStock` em cada tela.
 */
import type { Instrument, Material } from "./entities";

/**
 * Só materiais têm estoque mínimo: são eles que se consomem e precisam de
 * reposição. Instrumental é reutilizável, então não entra nesta regra — e a
 * assinatura impede que volte a entrar por descuido.
 */
export function isLowStock(item: Pick<Material, "stock" | "minStock">): boolean {
  return item.stock <= item.minStock;
}

export function isOutOfStock(item: Pick<Material | Instrument, "stock">): boolean {
  return item.stock <= 0;
}
