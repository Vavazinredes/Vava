import { exercises } from './curator'

export function acceptsAnswer(index: number, answer: string) {
  return exercises[index]?.answer === answer.trim().toLocaleLowerCase('es-AR')
}
