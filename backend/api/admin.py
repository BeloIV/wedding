from django.contrib import admin
from .models import (
    WeddingInfo, Guest, BudgetCategory, BudgetItem,
    Task, Vendor, WishlistItem, Gallery, Photo,
    RSVPResponse, ProgramItem,
)

admin.site.register(WeddingInfo)
admin.site.register(Guest)
admin.site.register(BudgetCategory)
admin.site.register(BudgetItem)
admin.site.register(Task)
admin.site.register(Vendor)
admin.site.register(WishlistItem)
admin.site.register(Gallery)
admin.site.register(Photo)
admin.site.register(RSVPResponse)
admin.site.register(ProgramItem)
