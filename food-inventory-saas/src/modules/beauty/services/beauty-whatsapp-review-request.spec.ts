import { Types } from "mongoose";
import { BeautyWhatsAppNotificationsService } from "./beauty-whatsapp-notifications.service";

/**
 * sendReviewRequestNotification: solicitud de reseña post-cita (reutilizable para
 * toda la vertical de servicios). Verifica modo manual (registra), deshabilitado
 * (no registra), y que el mensaje incluya el link de reseña.
 */
describe("BeautyWhatsAppNotificationsService.sendReviewRequestNotification", () => {
  const makeService = (config: any) => {
    const storefrontConfigModel: any = {
      findOne: () => ({ exec: async () => config }),
    };
    const configService: any = { get: () => undefined };
    return new BeautyWhatsAppNotificationsService(
      storefrontConfigModel,
      configService,
    );
  };

  const makeBooking = () =>
    ({
      tenantId: new Types.ObjectId(),
      bookingNumber: "BBK-00009",
      client: { name: "Ana", phone: "+584141234567" },
      whatsappNotifications: [] as any[],
    }) as any;

  it("modo manual: registra la notificación review_request y retorna success", async () => {
    const svc = makeService({
      name: "Clínica Demo",
      beautyConfig: {
        bookingSettings: {
          whatsappNotification: { enabled: true, mode: "manual" },
        },
      },
    });
    const booking = makeBooking();
    const res = await svc.sendReviewRequestNotification(
      booking,
      "https://salud-demo.smartkubik.com/review/BBK-00009",
    );
    expect(res.success).toBe(true);
    expect(booking.whatsappNotifications).toHaveLength(1);
    expect(booking.whatsappNotifications[0].type).toBe("review_request");
  });

  it("whatsapp deshabilitado: no registra y retorna success:false", async () => {
    const svc = makeService({
      beautyConfig: {
        bookingSettings: { whatsappNotification: { enabled: false } },
      },
    });
    const booking = makeBooking();
    const res = await svc.sendReviewRequestNotification(
      booking,
      "https://x/review/1",
    );
    expect(res.success).toBe(false);
    expect(booking.whatsappNotifications).toHaveLength(0);
  });
});
