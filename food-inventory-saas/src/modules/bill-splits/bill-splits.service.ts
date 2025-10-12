import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BillSplit } from '../../schemas/bill-split.schema';
import { Order } from '../../schemas/order.schema';
import { Payment } from '../../schemas/payment.schema';
import {
  CreateBillSplitDto,
  SplitEquallyDto,
  SplitByItemsDto,
  PaySplitPartDto,
  UpdateSplitPartTipDto,
} from '../../dto/bill-split.dto';

@Injectable()
export class BillSplitsService {
  private readonly logger = new Logger(BillSplitsService.name);

  constructor(
    @InjectModel(BillSplit.name)
    private billSplitModel: Model<BillSplit>,
    @InjectModel(Order.name)
    private orderModel: Model<Order>,
    @InjectModel(Payment.name)
    private paymentModel: Model<Payment>,
  ) {}

  /**
   * Dividir cuenta equitativamente entre N personas
   */
  async splitEqually(
    dto: SplitEquallyDto,
    userId: string,
    tenantId: string,
  ): Promise<BillSplit> {
    this.logger.log(
      `Splitting order ${dto.orderId} equally among ${dto.numberOfPeople} people`,
    );

    // Obtener la orden
    const order = await this.orderModel
      .findOne({ _id: dto.orderId, tenantId })
      .exec();

    if (!order) {
      throw new NotFoundException(`Order with ID ${dto.orderId} not found`);
    }

    // Validar que la orden no esté ya dividida
    if (order.isSplit && order.activeSplitId) {
      throw new BadRequestException(
        'Order is already split. Cancel the existing split first.',
      );
    }

    // Validar que la orden esté confirmada
    if (order.status === 'draft' || order.status === 'cancelled') {
      throw new BadRequestException(
        'Cannot split a draft or cancelled order',
      );
    }

    const { numberOfPeople, tipPercentage = 0, personNames } = dto;

    // Calcular totales
    const baseAmount = order.totalAmount;
    const tipTotal = tipPercentage > 0 ? (baseAmount * tipPercentage) / 100 : 0;
    const grandTotal = baseAmount + tipTotal;
    const amountPerPerson = grandTotal / numberOfPeople;
    const tipPerPerson = tipTotal / numberOfPeople;

    // Crear las partes
    const parts: any[] = [];
    for (let i = 0; i < numberOfPeople; i++) {
      const personName =
        personNames && personNames[i]
          ? personNames[i]
          : `Persona ${i + 1}`;

      parts.push({
        personName,
        amount: amountPerPerson - tipPerPerson,
        tipAmount: tipPerPerson,
        totalAmount: amountPerPerson,
        itemIds: [], // En split equally no se asignan items específicos
        paymentStatus: 'pending',
      });
    }

    // Crear el split
    const split = new this.billSplitModel({
      orderId: order._id,
      orderNumber: order.orderNumber,
      splitType: 'by_person',
      numberOfPeople,
      originalAmount: baseAmount,
      totalTips: tipTotal,
      totalAmount: grandTotal,
      parts,
      status: 'active',
      createdBy: new Types.ObjectId(userId),
      tableId: order.tableId,
      tenantId,
      isDeleted: false,
    });

    await split.save();

    // Actualizar la orden
    await this.orderModel
      .findByIdAndUpdate(order._id, {
        $set: {
          isSplit: true,
          activeSplitId: split._id,
          totalTipsAmount: tipTotal,
        },
      })
      .exec();

    this.logger.log(`Created split ${split._id} for order ${order.orderNumber}`);
    return split;
  }

  /**
   * Dividir cuenta por items (cada quien paga lo que consumió)
   */
  async splitByItems(
    dto: SplitByItemsDto,
    userId: string,
    tenantId: string,
  ): Promise<BillSplit> {
    this.logger.log(`Splitting order ${dto.orderId} by items`);

    const order = await this.orderModel
      .findOne({ _id: dto.orderId, tenantId })
      .exec();

    if (!order) {
      throw new NotFoundException(`Order with ID ${dto.orderId} not found`);
    }

    if (order.isSplit && order.activeSplitId) {
      throw new BadRequestException(
        'Order is already split. Cancel the existing split first.',
      );
    }

    const { assignments, tipPercentage = 0 } = dto;

    // Validar que todos los items estén asignados
    const allItemIds = order.items.map((item: any) => item._id.toString());
    const assignedItemIds = new Set<string>();

    assignments.forEach((assignment) => {
      assignment.itemIds.forEach((id) => assignedItemIds.add(id));
    });

    const unassignedItems = allItemIds.filter((id) => !assignedItemIds.has(id));
    if (unassignedItems.length > 0) {
      throw new BadRequestException(
        `The following items are not assigned: ${unassignedItems.join(', ')}`,
      );
    }

    // Calcular el monto de cada persona basado en los items asignados
    const parts = assignments.map((assignment) => {
      let personTotal = 0;

      assignment.itemIds.forEach((itemId) => {
        const item = order.items.find((i: any) => i._id.toString() === itemId);
        if (item) {
          personTotal += item.finalPrice;
        }
      });

      // Calcular propina
      const tipAmount =
        assignment.tipAmount !== undefined
          ? assignment.tipAmount
          : tipPercentage > 0
          ? (personTotal * tipPercentage) / 100
          : 0;

      return {
        personName: assignment.personName,
        amount: personTotal,
        tipAmount,
        totalAmount: personTotal + tipAmount,
        itemIds: assignment.itemIds,
        paymentStatus: 'pending',
      };
    });

    const totalTips = parts.reduce((sum, part) => sum + part.tipAmount, 0);
    const grandTotal = order.totalAmount + totalTips;

    // Crear el split
    const split = new this.billSplitModel({
      orderId: order._id,
      orderNumber: order.orderNumber,
      splitType: 'by_items',
      numberOfPeople: assignments.length,
      originalAmount: order.totalAmount,
      totalTips,
      totalAmount: grandTotal,
      parts,
      status: 'active',
      createdBy: new Types.ObjectId(userId),
      tableId: order.tableId,
      tenantId,
      isDeleted: false,
    });

    await split.save();

    // Actualizar la orden
    await this.orderModel
      .findByIdAndUpdate(order._id, {
        $set: {
          isSplit: true,
          activeSplitId: split._id,
          totalTipsAmount: totalTips,
        },
      })
      .exec();

    this.logger.log(`Created item-based split ${split._id} for order ${order.orderNumber}`);
    return split;
  }

  /**
   * Crear split personalizado
   */
  async createCustomSplit(
    dto: CreateBillSplitDto,
    userId: string,
    tenantId: string,
  ): Promise<BillSplit> {
    const order = await this.orderModel
      .findOne({ _id: dto.orderId, tenantId })
      .exec();

    if (!order) {
      throw new NotFoundException(`Order with ID ${dto.orderId} not found`);
    }

    if (order.isSplit && order.activeSplitId) {
      throw new BadRequestException(
        'Order is already split. Cancel the existing split first.',
      );
    }

    // Validar que la suma de las partes = total de la orden + tips
    const totalFromParts = dto.parts.reduce(
      (sum, part) => sum + part.totalAmount,
      0,
    );
    const totalTips = dto.parts.reduce((sum, part) => sum + (part.tipAmount || 0), 0);

    const split = new this.billSplitModel({
      orderId: order._id,
      orderNumber: order.orderNumber,
      splitType: dto.splitType,
      numberOfPeople: dto.numberOfPeople,
      originalAmount: order.totalAmount,
      totalTips,
      totalAmount: totalFromParts,
      parts: dto.parts.map((part) => ({
        ...part,
        paymentStatus: 'pending',
      })),
      status: 'active',
      createdBy: new Types.ObjectId(userId),
      tableId: order.tableId,
      notes: dto.notes,
      tenantId,
      isDeleted: false,
    });

    await split.save();

    await this.orderModel
      .findByIdAndUpdate(order._id, {
        $set: {
          isSplit: true,
          activeSplitId: split._id,
          totalTipsAmount: totalTips,
        },
      })
      .exec();

    this.logger.log(`Created custom split ${split._id} for order ${order.orderNumber}`);
    return split;
  }

  /**
   * Registrar pago de una parte del split
   */
  async paySplitPart(
    dto: PaySplitPartDto,
    userId: string,
    tenantId: string,
  ): Promise<Payment> {
    const split = await this.billSplitModel
      .findOne({ _id: dto.splitId, tenantId, isDeleted: false })
      .exec();

    if (!split) {
      throw new NotFoundException(`Bill split with ID ${dto.splitId} not found`);
    }

    if (split.status !== 'active') {
      throw new BadRequestException('Bill split is not active');
    }

    // Encontrar la parte
    const partIndex = split.parts.findIndex(
      (p) => p.personName === dto.personName,
    );

    if (partIndex === -1) {
      throw new NotFoundException(
        `Person "${dto.personName}" not found in this split`,
      );
    }

    const part = split.parts[partIndex];

    if (part.paymentStatus === 'paid') {
      throw new BadRequestException('This part has already been paid');
    }

    // Crear el pago
    const payment = new this.paymentModel({
      tenantId,
      paymentType: 'sale',
      orderId: split.orderId,
      date: new Date(),
      amount: dto.amount,
      method: dto.paymentMethod,
      currency: dto.currency || 'VES',
      reference: dto.reference,
      status: 'confirmed',
      createdBy: new Types.ObjectId(userId),
      confirmedAt: new Date(),
      confirmedBy: new Types.ObjectId(userId),
      // Campos de split
      tipAmount: part.tipAmount,
      splitId: split._id,
      customerName: dto.customerName || dto.personName,
    });

    await payment.save();

    // Actualizar la parte del split
    split.parts[partIndex].paymentStatus = 'paid';
    split.parts[partIndex].paymentId = payment._id;
    split.parts[partIndex].paidAt = new Date();

    // Verificar si todas las partes están pagadas
    const allPaid = split.parts.every((p) => p.paymentStatus === 'paid');

    if (allPaid) {
      split.status = 'completed';
      split.completedAt = new Date();

      // Actualizar la orden
      await this.orderModel
        .findByIdAndUpdate(split.orderId, {
          $set: {
            paymentStatus: 'paid',
          },
          $push: {
            payments: payment._id,
          },
        })
        .exec();
    } else {
      // Solo agregar el pago a la orden
      await this.orderModel
        .findByIdAndUpdate(split.orderId, {
          $push: {
            payments: payment._id,
          },
        })
        .exec();
    }

    await split.save();

    this.logger.log(
      `Registered payment for ${dto.personName} in split ${split._id}`,
    );
    return payment;
  }

  /**
   * Actualizar propina de una parte
   */
  async updatePartTip(
    dto: UpdateSplitPartTipDto,
    tenantId: string,
  ): Promise<BillSplit> {
    const split = await this.billSplitModel
      .findOne({ _id: dto.splitId, tenantId, isDeleted: false })
      .exec();

    if (!split) {
      throw new NotFoundException(`Bill split with ID ${dto.splitId} not found`);
    }

    if (split.status !== 'active') {
      throw new BadRequestException('Can only update tips on active splits');
    }

    const partIndex = split.parts.findIndex(
      (p) => p.personName === dto.personName,
    );

    if (partIndex === -1) {
      throw new NotFoundException(
        `Person "${dto.personName}" not found in this split`,
      );
    }

    const oldTip = split.parts[partIndex].tipAmount;
    const newTip = dto.tipAmount;

    split.parts[partIndex].tipAmount = newTip;
    split.parts[partIndex].totalAmount =
      split.parts[partIndex].amount + newTip;

    // Recalcular totales
    split.totalTips = split.parts.reduce((sum, p) => sum + p.tipAmount, 0);
    split.totalAmount = split.originalAmount + split.totalTips;

    await split.save();

    // Actualizar la orden
    await this.orderModel
      .findByIdAndUpdate(split.orderId, {
        $set: {
          totalTipsAmount: split.totalTips,
        },
      })
      .exec();

    this.logger.log(
      `Updated tip for ${dto.personName} from $${oldTip} to $${newTip}`,
    );
    return split;
  }

  /**
   * Obtener split por ID
   */
  async findById(id: string, tenantId: string): Promise<BillSplit> {
    const split = await this.billSplitModel
      .findOne({ _id: id, tenantId, isDeleted: false })
      .populate('orderId')
      .populate('parts.paymentId')
      .exec();

    if (!split) {
      throw new NotFoundException(`Bill split with ID ${id} not found`);
    }

    return split;
  }

  /**
   * Obtener split activo de una orden
   */
  async findByOrderId(orderId: string, tenantId: string): Promise<BillSplit> {
    const split = await this.billSplitModel
      .findOne({
        orderId,
        tenantId,
        status: 'active',
        isDeleted: false,
      })
      .populate('parts.paymentId')
      .exec();

    if (!split) {
      throw new NotFoundException(
        `No active bill split found for order ${orderId}`,
      );
    }

    return split;
  }

  /**
   * Cancelar un split (volver la orden a normal)
   */
  async cancelSplit(id: string, tenantId: string): Promise<void> {
    const split = await this.billSplitModel
      .findOne({ _id: id, tenantId, isDeleted: false })
      .exec();

    if (!split) {
      throw new NotFoundException(`Bill split with ID ${id} not found`);
    }

    // Validar que no haya pagos confirmados
    const hasPaidParts = split.parts.some((p) => p.paymentStatus === 'paid');

    if (hasPaidParts) {
      throw new BadRequestException(
        'Cannot cancel a split with confirmed payments',
      );
    }

    split.status = 'cancelled';
    await split.save();

    // Actualizar la orden
    await this.orderModel
      .findByIdAndUpdate(split.orderId, {
        $set: {
          isSplit: false,
          activeSplitId: null,
          totalTipsAmount: 0,
        },
      })
      .exec();

    this.logger.log(`Cancelled split ${id}`);
  }

  /**
   * Listar todos los splits activos
   */
  async findAll(tenantId: string): Promise<BillSplit[]> {
    return this.billSplitModel
      .find({ tenantId, isDeleted: false })
      .populate('orderId')
      .sort({ createdAt: -1 })
      .exec();
  }
}
